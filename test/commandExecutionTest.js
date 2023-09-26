const chai = require('chai')
const expect = chai.expect

const validator = require('../src/R.js')

describe("validator executeRCommand()", () => {

	it("should return 2 if executing 1+1", ()=> {
		expect(validator.executeRCommand("1+1")).to.have.members([2])
	})

    it("should return multiple outputs when executing commands separated by semicolon", ()=> {
		expect(validator.executeRCommand("print(1+1); print(5+5)")).to.have.members(["2", "10"])
	})

})

describe("validator executeRScript()", () => {

	it("should return 2 if printing 1+1 by executing an external RScript", ()=> {
		expect(validator.executeRScript("test/RScripts/test_basic.R")).to.have.members([2])
	})

    it("should return multiple values by executing an external RScript", ()=> {
		expect(validator.executeRScript("test/RScripts/test_basic_multiple.R")).to.have.members(["2", "4", "6"])
	})

    it("should return the parsed JSON object by executing an external RScript", ()=> {
		expect(validator.executeRScript("test/RScripts/test_parsableJSON.R")[0]).to.have.lengthOf(4)
	})

})

describe("validator callMethod()", () => {

	it("should return 10 if calling the method x with parameter 5", ()=> {
		expect(validator.callMethod("test/RScripts/test_method.R", "x", [5])).to.have.members([10])
	})

	it("should return 10 if calling the method x with object parameter 5", ()=> {
		expect(validator.callMethod("test/RScripts/test_method.R", "x", {data: 5})).to.have.members([10])
	})

    it("should return the max between 10 and 20", ()=> {
		expect(validator.callMethod("test/RScripts/test_method_multiple_params.R", "max", [10, 20])).to.have.members([20])
	})

    it("should return the max between 10 and 20 with object parameters", ()=> {
		expect(validator.callMethod("test/RScripts/test_method_multiple_params.R", "newMax",{x:10, y:20})).to.have.members([20])
	})

})


describe("validator callStandardMethod()", () => {

	it("should return 5 if calling the method max with parameter 5", ()=> {
		expect(validator.callStandardMethod("max", [5])).to.have.members([5])
	})

	it("should return 5 if calling the method max with object parameter 5", ()=> {
		expect(validator.callStandardMethod("max", {data: [5]})).to.have.members([5])
	})

    it("should return the max between 10 and 20", ()=> {
		expect(validator.callStandardMethod("max", [10, 20])).to.have.members([20])
	})

    it("should return the max between 10 and 20 with object parameters", ()=> {
		expect(validator.callStandardMethod("max",{x:10, y:20})).to.have.members([20])
	})

    it("should return the upper case of an array in case of NA values", ()=> {
        const arrayOfStrings = ["a", "b", "c", , "f", "g"]
        expect(validator.callStandardMethod("toupper",arrayOfStrings)).to.have.members(['A', 'B', 'C', undefined, 'F', 'G'])
    })

    it("should return the max between a list of numbers including NA, which is NA", ()=> {
        const arrayOfStrings = [3, 1, 5, , 4, 3]
        expect(validator.callStandardMethod("max",arrayOfStrings)).to.have.members([undefined])
    })

})

describe("validator executeRRawScript()", () => {
	it("should return array, in calculate latency with a raw script", async () => {
		const dbData = [
			{
				aluno: 123456,
				q1: 1,
				q2: 1,
				q3: 1,
				q4: 0,
			},
			{
				aluno: 123426,
				q1: 0,
				q2: 1,
				q3: 1,
				q4: 0,
			},
			{
				aluno: 3312,
				q1: 1,
				q2: 1,
				q3: 1,
				q4: 1,
			},
			{
				aluno: 321231,
				q1: 1,
				q2: 0,
				q3: 1,
				q4: 0,
			}
		]
		
		const res = await validator.executeRRawScript(`
		if(!require(ltm)) install.packages("ltm", repos = "http://cran.us.r-project.org")
		
		library("ltm")
		
		options(max.print=1000000)
		options(scipen = 999, digits = 4)
		data = NODE_INJECT('dados')
		data[,c(2:NODE_INJECT('columns'))]
		
		IRT3pl = tpm(data[,c(2:NODE_INJECT('columns'))], type="latent.trait", IRT.param = T)
		a=factor.scores.tpm(IRT3pl, resp.patterns = data[,c(2:NODE_INJECT('columns'))])
		z1 = a$score.dat[,NODE_INJECT('columns')+2]
		data[,1]
		ajust = function(x){
			return((x-min(x))/(max(x)-min(x))*100)
		}
		
		data2 = cbind(data[,1],z1)
		data3=cbind(data2,ajust(z1))
		NODE_OUTPUT_TABLE(data3)`,
		{
			dados: dbData,
			columns: 5
		})

		expect(res.length).to.greaterThanOrEqual(4)
	})
})
