const SAMPLES={
animals:{title:'Animal taxonomy (inheritance, exceptions, rules)',text:`# Animal taxonomy - open-world knowledge base
@relation eats | also: eat
@relation lives in | also: live in
Dog is a mammal.
Cat is a mammal.
Whale is a mammal.
Mammal is an animal.
Eagle is a bird.
Penguin is a bird.
Bird is an animal.
Salmon is a fish.
Fish is an animal.
Rex is a dog.
Tweety is a penguin.
Mammal has fur.
Bird can fly.
Penguin cannot fly.
Whale is not a fish.
Eagle eats salmon.
Whale lives in ocean.
If ?x is a bird then ?x can lay eggs.
If ?x eats ?y and ?y is a fish then ?x is a carnivore.`,
eval:[
{q:'Is Rex a mammal?',a:['yes']},{q:'Is Tweety an animal?',a:['yes']},{q:'Can Tweety fly?',a:['no']},{q:'Can Eagle fly?',a:['yes']},
{q:'Can Rex fly?',a:['unknown']},{q:'Does Rex have fur?',a:['yes']},{q:'Can Tweety lay eggs?',a:['yes']},
{q:'List all birds',a:['eagle','penguin','tweety']},{q:'Which animals eat salmon?',a:['eagle']},{q:'What eats salmon?',a:['eagle']},
{q:'Is Eagle a carnivore?',a:['yes']},{q:'How many mammals are there?',a:['4']},{q:'Is Whale a fish?',a:['no']},
{q:'Is Cat a dog?',a:['unknown']},{q:'Who is the president of France?',a:['unknown']}]},
solar:{title:'Solar System (numeric facts, transitive relations, closed world)',text:`# Solar System - closed-world knowledge base
@closed
@relation orbits | also: orbit
@relation is part of | transitive | also: part of
@scale diameter | larger, largest | smaller, smallest
Mercury is a planet.
Venus is a planet.
Earth is a planet.
Mars is a planet.
Jupiter is a planet.
Saturn is a planet.
Uranus is a planet.
Neptune is a planet.
The Sun is a star.
Mercury has a diameter of 4879 km.
Venus has a diameter of 12104 km.
Earth has a diameter of 12742 km.
Mars has a diameter of 6779 km.
Jupiter has a diameter of 139820 km.
Saturn has a diameter of 116460 km.
Uranus has a diameter of 50724 km.
Neptune has a diameter of 49244 km.
Mercury orbits the Sun.
Venus orbits the Sun.
Earth orbits the Sun.
Mars orbits the Sun.
Jupiter orbits the Sun.
Saturn orbits the Sun.
Uranus orbits the Sun.
Neptune orbits the Sun.
Luna orbits Earth.
Phobos orbits Mars.
Deimos orbits Mars.
Phobos is part of Mars.
Mars is part of the Solar System.
If ?x orbits ?y and ?y is a planet then ?x is a moon.`,
eval:[
{q:'What is the diameter of Mars?',a:['6779 km']},{q:'Which planet has the largest diameter?',a:['jupiter']},
{q:'Which planet has the smallest diameter?',a:['mercury']},{q:'What is the largest planet?',a:['jupiter']},
{q:'What orbits the Sun?',a:['mercury','venus','earth','mars','jupiter','saturn','uranus','neptune']},
{q:'Which planets orbit the Sun?',a:['mercury','venus','earth','mars','jupiter','saturn','uranus','neptune']},
{q:'What orbits Mars?',a:['phobos','deimos']},{q:'Is Phobos part of the Solar System?',a:['yes']},
{q:'How many planets are there?',a:['8']},{q:'Is Pluto a planet?',a:['no']},{q:'Is Jupiter larger than Earth?',a:['yes']},
{q:'Is Mars larger than Earth?',a:['no']},{q:'List all moons',a:['luna','phobos','deimos']},{q:'Is the Sun a star?',a:['yes']},
{q:'Who is the mayor of Mars?',a:['unknown']}]}};
if(typeof module!='undefined')module.exports=SAMPLES;
